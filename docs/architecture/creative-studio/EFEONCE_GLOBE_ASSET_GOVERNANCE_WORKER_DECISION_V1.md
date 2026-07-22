# Efeonce Globe — Asynchronous Asset Governance Worker Decision V1

- Decision: ADR-007
- Status: Accepted for internal implementation; rollout and live canaries gated
- Date: 2026-07-22
- Owners: Efeonce Globe platform, security and creative operations
- Implements: TASK-1467; enables TASK-1505
- Related: `EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`, `EFEONCE_GLOBE_PERSISTED_TENANCY_PROJECTION_DECISION_V1.md`, `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`

## Decision

Private reference ingest and generated outputs enter the same asynchronous, durable asset-governance pipeline.
The request path may validate only server-observed object metadata, persist an asset as quarantined and enqueue an
idempotent job. It must return without downloading media or running malware, C2PA or rights engines in the web
process. No asset is reference-eligible, exportable or represented as verified while that job is pending.

A dedicated, keyless, one-shot Cloud Run Job claims bounded work from PostgreSQL, processes it and exits. Cloud
Scheduler invokes the job; it is not a long-lived timer hidden inside a request-serving Cloud Run service. Jobs,
leases and evidence are durable, retryable and fenced so multiple executions can recover abandoned work without
performing the same terminal transition twice.

The mandatory order is:

1. server-side object inspection and bounded materialization;
2. malware scan, which must produce a clean verdict before any later engine runs;
3. C2PA verification against a versioned trust policy;
4. rights reconciliation against server-side claims and evidence; and
5. projection to `eligible`, `rejected` or `failed`, followed by retention/legal-hold handling.

Missing engines, stale signatures, incomplete evidence, ambiguous rights, a stale tenancy projection or any
unexpected transition fail closed. The browser can submit an opaque evidence reference but cannot assert rights,
provenance, C2PA validity or a clean malware result.

## Runtime and authority boundary

- The worker has its own service account and least-privilege IAM. It receives no long-lived key and no
  `roles/editor`, bucket-wide admin or database-owner privilege.
- Workspace discovery is paginated from Globe's persisted tenancy projection. Only `shadow|active` workspaces with
  an active, unexpired broker projection are considered; suspended, expired or missing projections never reach the
  tenant-scoped job store. A static workspace environment list and `BYPASSRLS` are forbidden.
- Request completion is the enqueue authority. Candidate listing is reconciliation only and may not invent a job.
- Source bytes are read only from allowlisted Globe-owned GCS locations. Arbitrary URLs, browser-provided storage
  paths and scanner callbacks are not byte authorities.
- Objects remain quarantined until terminal eligibility. Promotion uses content-addressed names and verified hashes;
  large GCS copies use resumable/multi-step rewrite rather than process memory.
- Engine binaries, signatures and trust policies are versioned in evidence. A freshness gate rejects stale malware
  intelligence instead of silently scanning with unknown state.
- C2PA verification uses the maintained `contentauth/c2pa-rs` CLI line, pinned by release and archive digest, plus
  an official trust-list commit and policy digest. A manifest is not a verified result: only an explicit `Trusted`
  verdict may project verified provenance.
- Retention intents are append-only. Legal hold dominates expiry and deletion; cleanup is never inferred from a UI
  action alone.

## Durable model

`asset_governance_jobs` owns lifecycle, attempts, lease owner/token/expiry, next retry and terminal outcome.
`asset_governance_evidence` is append-only and correlates engine, version, policy, input digest, normalized verdict
and restrictions. Database constraints and the domain state machine both prohibit C2PA/rights stages before a clean
malware result. Tenant RLS and composite workspace keys prevent cross-workspace lookup or mutation.

Generated outputs do not bypass this model: provider retrieval streams to governed staging, computes the digest,
promotes content-addressably and enqueues the same governance lifecycle before the asset can be reused or exported.
Their rights stage resolves an immutable policy exact to route, provider, model and version, valid at generation
time and bound to a provider-terms digest. Derived outputs additionally snapshot every eligible parent and inherit
the union of restrictions monotonically. A missing/expired policy, parent drift or incomplete authority fails closed.

## Alternatives rejected

- **Synchronous scanning in upload completion:** couples request latency and retry semantics to heavy, fallible
  engines and can strand partially processed assets.
- **Background `setInterval` in the web/API service:** Cloud Run CPU allocation and instance lifecycle do not
  guarantee execution, singleton behavior or recovery.
- **Static workspace list:** does not scale and can continue processing a revoked tenant.
- **Browser-declared rights or provenance:** turns untrusted UX input into authorization/evidence.
- **C2PA before malware:** exposes the verifier to untrusted bytes before the mandatory safety gate.
- **One giant in-memory download/copy:** cannot support approved high-resolution/video assets safely.

## Fitness functions and rollout gates

- An EICAR fixture is rejected and no C2PA/rights engine is invoked after its malware verdict.
- Clean signed, clean unsigned, malformed C2PA and ambiguous-rights fixtures reach distinct, honest outcomes.
- Replay, lease expiry and concurrent workers never create two terminal outcomes or cross tenants.
- More than one page of eligible workspaces is processed; suspended/expired projections are excluded in SQL and in
  the authority adapter.
- Memory stays bounded for the maximum supported asset and GCS promotion is resumable.
- Engine version, signature age, trust-policy version, source hash and decision evidence are queryable per asset.
- UI and API expose queued/inspecting/malware/C2PA/rights/terminal stages without fabricated progress or badges.
- Rollout remains off until migrations, IAM, Scheduler/Job deployment, alerting and live canaries have passed in the
  target environment. Code-complete is not operationally complete.

## Consequences

The approved Producer can keep its rich upload, provenance and reusable-library experience without pretending that
heavy verification is instant. The topology adds a separately deployable worker, operational alerts and signature/
trust-policy maintenance, but makes processing scalable, recoverable and independently securable. Rollback disables
new claims and scheduler invocation while preserving quarantined assets, durable jobs and evidence for recovery.
