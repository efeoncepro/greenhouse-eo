# Efeonce Embed Runtime Delivery Decision V1

- Status: Superseded by [Efeonce Embed Runtime Delivery and Isolation Decision V2](GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md)
- Date: 2026-07-22
- Owner: Growth / Public Site / Platform
- Scope: portable Forms, CTAs and Meetings renderers across WordPress, Think/Astro and future approved hosts
- Decision confidence: medium-high
- Reversibility: runtime/provider cutover is two-way; enabling Firebase on shared `efeonce-group` is a one-way
  infrastructure mutation; deleting the project/site is never rollback
- Supersedes: [Public Renderer Artifact Delivery Decision V1](GREENHOUSE_PUBLIC_RENDERER_ARTIFACT_DELIVERY_DECISION_V1.md)
- Superseded by: [Efeonce Embed Runtime Delivery and Isolation Decision V2](GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md)

## Context

Growth Forms, CTAs and Meetings are browser renderers owned by Greenhouse but consumed outside the Greenhouse application. WordPress and Think/Astro must receive visual changes without an unrelated Greenhouse application release. The current state solves this unevenly:

- Forms and CTAs are emitted by the Greenhouse `prebuild` and consumed through mutable `renderer-latest.js` URLs under the Greenhouse application origin.
- Meetings has an independent Vercel static project and content-addressed releases, but its current local promotion lane is not yet a common platform for the renderer fleet.
- CTA contains provider-specific dependencies on the Forms and Meetings asset URLs.
- WordPress and Think host CSS currently reaches into renderer classes, making undocumented DOM details a compatibility surface.
- All three renderers emit browser telemetry into the host document, while server ledgers remain the conversion sources of truth.

The architecture must preserve independent visual delivery, portability across WordPress and Astro, GTM compatibility, cheap rollback and compatibility with the Greenhouse control plane. It must not move booking, form submission, consent, targeting or conversion state into a static host.

## Decision

Create **Efeonce Embed Runtime** as a common delivery platform and protocol for three independently versioned products: Forms, CTAs and Meetings.

1. **Greenhouse remains the control plane and API/data authority.** It owns renderer source, public contracts, API compatibility, business state, consent rules, release policy and evidence.
2. **Firebase Hosting Classic, through a dedicated secondary site in shared project `efeonce-group`, is the target
   static delivery plane.** It serves only public JS, CSS, manifests, loader files and health metadata. It owns no
   secrets, PII, submissions, bookings or targeting state. This isolates content/domain/deploy identity, not project,
   IAM, billing or quotas.
3. **`assets.efeoncepro.com` is the canonical public origin.** Host integrations depend on this neutral domain and the Embed Runtime protocol, not on `web.app`, `vercel.app`, Greenhouse deployment URLs or a cloud-vendor SDK.
4. **Forms, CTAs and Meetings keep independent releases, channel pointers, health and rollback.** A shared protocol and release pipeline do not create a megabundle or a shared product version.
5. **Artifacts are content-addressed and immutable.** Mutable channel manifests select immutable release assets. Every live fleet snapshot retains the releases that can still be referenced so promotion cannot create a manifest/asset race.
6. **Promotion is build-once and clone-forward.** GitHub Actions uses protected environments and short-lived Google identity through OIDC/Workload Identity Federation. A verified preview channel is cloned exactly to live; production does not rebuild source.
7. **Vercel remains the migration and fallback rail.** The current Meetings lane is stabilized first. Firebase becomes authoritative only after a mandatory spike proves auth, custom domain, cache headers, preview-to-live clone, rollback, real-host compatibility and cost observability.
8. **Legacy URLs receive compatibility shims for a declared window.** Existing WordPress/Think consumers are migrated deliberately; no provider URL is removed merely because the new lane exists.
9. **GTM and consent remain host-owned.** Renderers execute in the host document, dispatch their approved `CustomEvent`/`dataLayer` contract and never load GTM themselves. Browser telemetry is directional evidence; Greenhouse server ledgers remain authoritative for accepted submissions and confirmed bookings.
10. **Firebase is enabled in the existing GCP project `efeonce-group`.** The delivery boundary is a dedicated Hosting
    site with explicit configuration and a dedicated least-privilege publisher federated through the repository's
    canonical WIF provider; no parallel GCP project is created. The current general deployer is not reused because its
    Cloud Run, Secret Manager and Storage permissions exceed this static publication boundary.
11. **Live promotion is concurrency-safe.** A candidate may clone only when its `baseFleetDigest` equals the current
    live fleet digest; otherwise it is recomposed, redeployed to preview and reverified. The live channel has one
    concurrency group.
12. **Firebase products beyond Hosting are forbidden.** No Firebase Web App/SDK, Auth, Firestore, Storage, Functions,
    App Hosting, Remote Config or Firebase Analytics enters the renderer. Bootstrap side effects are inventoried and
    restricted, not treated as approved product capabilities.

## Why Firebase Hosting

Firebase Hosting matches the workload: small static artifacts, global CDN, custom domain/TLS, preview channels, exact
channel cloning and rollback-oriented version history without introducing an application runtime. It reuses the
existing Google Cloud project and billing account, with compensating isolation through a secondary Hosting site and
dedicated WIF publisher, and can deploy from GitHub without long-lived service-account keys.

The choice is not based on Firebase application services. Cloud Functions, Firestore, Authentication and server-side business logic are outside this decision.

## Runtime Contract

The canonical contract is defined by [Efeonce Embed Runtime Architecture V1](GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md). At minimum:

- public paths are product-scoped: `/{product}/channels/{channel}.json` and `/{product}/releases/{releaseId}/...`;
- manifests declare `product`, `protocolVersion`, `rendererVersion`, `releaseId`, `sourceSha`, `contractVersion`, compatible API range, dependencies and asset hashes/SRI;
- `asset-base-url` and `api-base-url` are separate inputs;
- CTA resolves Forms and Meetings through the common registry/protocol, never hardcoded provider URLs;
- loaders and channel manifests revalidate; release assets are immutable;
- a promotion must pass WordPress and Think/Astro synthetics, telemetry/consent checks, accessibility and rollback verification;
- API compatibility supports at least current and previous compatible renderer contracts during rollout.

Until EPIC-035 completes the migration gates, current production URLs remain runtime truth for their respective consumers. This ADR governs new implementation and cutover sequencing; it does not claim that Firebase is already live.

## Alternatives Considered

### Keep the fleet on Vercel

Viable and retained as fallback. Vercel already serves Meetings and may have favorable included transfer. Rejected as the target because the current lane is local/manual, the organization wants Greenhouse-controlled deployment through its Google Cloud governance, and Firebase provides a direct preview-channel clone workflow for this static-only use case. If the Firebase spike fails, the same provider-neutral protocol can be completed on Vercel.

### Google Cloud Storage plus Cloud CDN

Technically robust, but it adds load balancer, managed certificate, backend bucket, cache invalidation and pricing complexity for a roughly 76 KB renderer fleet. Rejected for the current scale; revisit if edge controls or traffic economics justify the extra infrastructure.

### Create a parallel GCP/Firebase project

Rejected for the current scope. The existing `efeonce-group` project already provides the governed organization,
Cloud Billing and repository-restricted WIF boundary, while this runtime uses only static Hosting and no Firebase data
or server services. A second project would duplicate billing, IAM, WIF and IaC operations without a current regulatory,
ownership or lifecycle boundary. Revisit if Firebase gains stateful services, external tenant ownership, independent
chargeback/compliance, or a project-level quota/SLA blast-radius requirement.

### Cloud Run

Rejected. These artifacts need no server process. Cloud Run would add runtime, scaling, patching and failure modes without improving static delivery.

### Store artifacts in WordPress/Kinsta or duplicate them in each host

Rejected. It couples release, cache and rollback to each CMS/runtime, creates host drift and defeats one portable contract across WordPress and Astro.

### Continue bundling Forms and CTAs with every Greenhouse deploy

Rejected. It preserves the original coupling: a visual change requires an application release and an unrelated application build may mutate a public renderer.

## Consequences

### Benefits

- Visual renderer changes can ship without a Greenhouse application production release.
- WordPress and Think/Astro consume the same tested runtime contract.
- A neutral origin and standard web artifacts keep provider exit inexpensive.
- Independent product releases reduce blast radius while one protocol reduces duplicated operational logic.
- Preview-to-live cloning makes the promoted bytes identical to verified bytes.

### Costs and risks

- The team operates another delivery surface, custom domain, IAM policy, monitoring and budget alerts.
- A common fleet snapshot needs explicit retention; deleting old release paths reintroduces the current Meetings race.
- Shared pipeline defects can affect all products even though their artifacts remain independent.
- Firebase transfer can cost more than included Vercel transfer at high volume; cost is an operational gate, not an assumption.
- Host CSS/DOM coupling must be reduced or formally versioned before internal renderer markup can evolve safely.
- Adding Firebase to an existing GCP project is not completely reversible. Operational rollback removes consumers,
  DNS and new bindings or leaves the site inert; the Firebase enablement residue is documented and accepted.
- Hosting site separation isolates releases, configuration and domains, but IAM and Cloud Billing can remain
  project-scoped. TASK-1515 verifies supported granularity and does not claim a site-isolated budget or policy.
- Firebase enablement creates administrative side effects such as APIs, service accounts and a restricted browser API
  key; TASK-1515 records the before/after inventory. Existing project Owners/Editors retain their project-level reach.

## Cost Posture

As of 2026-07-22, Firebase Hosting includes 10 GB/month data transfer and 10 GB storage, then lists transfer at USD
0.15/GB and storage at USD 0.026/GB-month. The measured gzip fleet is approximately 76 KB, so current expected cost is
near zero at modest traffic; 100 GB/month is approximately USD 13.50 after the free transfer allowance.
`efeonce-group` already has billing enabled, so Firebase inherits Blaze. Hosting cost is observed through billing
export/service SKUs and transfer/storage telemetry. Project-wide budgets are secondary alerts and are not an isolated
limit for this site; billing must never be disabled automatically as a cost response.

Official references: [Hosting usage, quotas and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing), [Firebase pricing](https://firebase.google.com/pricing), [preview channels, clone and rollback](https://firebase.google.com/docs/hosting/manage-hosting-resources), [Firebase CLI authentication](https://firebase.google.com/docs/cli), [Workload Identity Federation for deployment pipelines](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).

## Revisit When

- The Firebase spike cannot prove keyless CI auth, exact preview-to-live promotion, rollback or correct cache behavior.
- Monthly transfer exceeds 250 GB or Firebase net delivery cost materially exceeds the available Vercel plan for three consecutive months.
- Independent product rollback cannot be maintained safely with fleet snapshots.
- The fleet requires signed manifests with a separate trust root, regional edge controls or private artifact delivery.
- More than five independently released embed products make a single Hosting site an operational bottleneck.
- Host integrations require iframe isolation; that would change GTM, consent, styling and accessibility contracts and requires a new ADR.
