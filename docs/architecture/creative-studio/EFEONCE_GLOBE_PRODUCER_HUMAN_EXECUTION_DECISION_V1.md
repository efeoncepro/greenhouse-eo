# Efeonce Globe — Producer Human Execution + Approved Product Target Decision V1

- **Status:** Accepted
- **Date:** 2026-07-22
- **Owner:** Efeonce Creative Technology / Globe
- **Scope:** Creative Producer human surface, `apps/studio-web`, Globe API Contract Spine, broker grants, run orchestration and Producer projections
- **Reversibility:** two-way-but-slow
- **Confidence:** high for the trust boundary and product target; medium for the final storage/projection decomposition until the owning tasks complete Discovery
- **Validated as of:** 2026-07-23 against the approved source and the deployed `efeonce-globe` runtime

## Context

The [approved Claude Design source](../../ui/visual-sources/TASK-1505/approved-prototype.dc.html) for `TASK-1505` is the complete target product experience, not a loose moodboard or a disposable prototype. It extends the original prompt-first Producer into a production surface with Image/Video/Audio composition, references and rights, estimate and budgets, unified library, collections, batch operations, candidate inspection and lineage, review/collaboration, read-only sharing and operator conveniences.

At decision time the human web principal received only `globe.studio.access`; that historical gap motivated this
ADR. `TASK-1519` has since implemented and live-verified the same-origin bridge, scoped broker grants, surface
enforcement and durable execution path without exposing workload identity to the browser. The trust boundary below
remains normative.

The current operational gap is session recovery: a valid session with rotated CSRF is refreshed single-flight and
retried once, but a truly missing/expired session returns `401` and still needs an explicit reauthentication CTA.
That state must never be presented as missing media or silently retried as a spend command.

## Decision

1. **The approved source is the target contract.** `TASK-1505` must implement every approved workflow. Delivery may be sliced, but a slice cannot silently delete, simplify away or reclassify an approved feature as non-goal. Any material product change requires explicit product/design approval and a versioned delta to the baseline.
2. **Producer remains distinct from the Workbench by entry model, not by being feature-poor.** Producer is prompt/model-first and optimizes direct generation and asset operations. The Professional Studio Workbench is brief/direction/engagement-first and coordinates agency delivery. Collections, review, provenance, budgets and sharing may exist in Producer when they operate generated assets; that does not turn it into the Workbench.
3. **Human execution uses a same-origin BFF bridge.** The browser talks only to the authenticated `studio-web` origin. `studio-web` derives the human principal and workspace from its server-side session/broker grant, then invokes the IAM-private Globe API with its workload identity. It forwards only a signed/verified, server-derived actor delegation contract and preserves `actorId`, `workspaceId`, `correlationId` and `idempotencyKey`. The browser never calls the private API directly and never receives a service credential or provider secret.
4. **Surface policy is enforced at ingress/dispatch.** A capability marked available for UI is reached through an explicit UI/BFF adapter that stamps a trusted surface context. The generic HTTP endpoint cannot claim `ui`, and no untrusted request field selects a surface. Coverage remains the machine-readable manifest; enforcement is a separate fail-closed runtime check with conformance tests for positive and negative paths.
5. **Expensive runs are durable workflows.** Submission writes the run intent, reservation and outbox/job handoff transactionally. A worker owns provider execution; cancellation, progress, retry, priority, timeout recovery, settlement/release and reconciliation are explicit state transitions. Idempotency is durable across replicas and client timeouts. An invented timer-based percentage is prohibited; progress exposes provider evidence or an honest coarse state.
6. **The approved target is backed by first-class domain contracts.** Upload/reference ingest, per-output descriptors, feed/library, collections, batch actions, budgets/ledger, provenance/C2PA claims, review/comments/approval, read-only share boards and durable tenancy each require owning commands/readers, policies, persistence and audit. They do not live as browser-only state or click-handler endpoints.
7. **Runtime stages remain explicit.** Internal human enablement is separate from commercial enablement. A commercial environment requires its own governed runtime contract, isolation/configuration, migration/secret/flag plan, rollback and live evidence; changing `GLOBE_ENVIRONMENT` is not a UI rollout side effect.

## Delta — 2026-07-23, TASK-1525 Live Producer Feed

The Producer feed is not a browser-local projection of retained library assets. A governed run is part of the
durable foreground feed from creation until it either resolves to an exact retained output or to an explicit terminal
failure/cancellation. The approved product target therefore requires a server-authoritative reader that unifies
`active-run`, `terminal-run` and `retained-asset` items under stable `(workspaceId, runId, experimentId)` identity.

The canonical live contract is:

- `globe.producer.feed.live.list` for initial/recovery pagination using an older-page cursor;
- `globe.producer.feed.live.changes` for foreground resumption using a newer-change watermark;
- `displayTitle` derived from client-safe route/model metadata, never from prompt text and never from a missing
  recipe as a permanent title;
- retained output media remains served only through the governed output retrieval path; the feed reader does not
  mint signed URLs, expose provider payloads or download bytes.

Error semantics also stay separated. `authentication_required` belongs to reauthentication UX, not to missing media.
`not_found`, `access_denied` and `dependency_unavailable` must not collapse into a generic broken preview. `TASK-1526`
owns the visible cards/viewer consumer of this reader, including the approved UI/UX delta against the Claude Design
source; `TASK-1525` owns only the durable projection and app/runtime wiring.

## Alternatives Considered

- **Browser calls `globe-api-internal` directly.** Rejected: a browser cannot hold the workload identity and would collapse the current IAM/private-API boundary.
- **Add Producer handlers directly to the web process.** Rejected: it duplicates business logic and turns deployment topology into an authority boundary, breaking Full API Parity.
- **Treat coverage metadata as authorization.** Rejected: the current HTTP dispatch always arrives as HTTP; metadata alone cannot prove a human/UI path.
- **Keep synchronous in-process execution and retry from the browser.** Rejected: client timeouts can duplicate spend, cancellation is ineffective once work begins, and replicas cannot reconcile orphaned runs.
- **Implement only the backend features already present and trim the approved UI.** Rejected: product approval governs the target; technical sequencing cannot rewrite approved scope.
- **Fold Producer into the Workbench.** Rejected: it couples direct creation to brief/direction orchestration and removes the low-ceremony entry point.

## Consequences

- `TASK-1505` becomes an integration surface over multiple backend/data dependencies, not a standalone frontend task.
- `TASK-1519` owns the human bridge, grants and enforceable UI surface path; `TASK-1469` owns durable run lifecycle; `TASK-1520` owns the library/collections/bulk-operation projection; `TASK-1521` owns commercial runtime enablement.
- Existing tasks remain owners for ingest/provenance (`TASK-1467`), ledger/budgets (`TASK-1468`/`TASK-1482`), recipes/reference intelligence/recreate/inpaint/feed (`TASK-1493`/`1494`/`1496`/`1497`/`1498`), review/comments/read-only share foundation (`TASK-1522`), release/delivery (`TASK-1472`), tenancy (`TASK-1511`) and cross-replica proof (`TASK-1512`).
- The first internal slice can ship before commercial readiness, but only with explicit unavailable states for target workflows whose backend owners are still open.
- The BFF becomes security-sensitive: it needs delegation tests, audit correlation, CSRF/session protections, bounded payloads and no secret/raw-error leakage.

## Runtime Contract

```text
Browser
  -> same-origin studio-web session + CSRF boundary
  -> Producer UI/BFF adapter (trusted surface=ui)
  -> workload-authenticated IAM-private Globe API
  -> CapabilityRegistry command/reader + policy
  -> durable Postgres transaction/outbox
  -> creative-runner job/provider seam
  -> asset/run/library/ledger/review projections
```

- The approved visual baseline is versioned at [`docs/ui/visual-sources/TASK-1505/`](../../ui/visual-sources/TASK-1505/README.md); `TASK-1505` owns its feature inventory and acceptance mapping.
- Globe owns creative runtime, data, storage, secrets and execution; Greenhouse remains the task/governance control plane and identity broker.
- `actorId`, `workspaceId`, `correlationId`, `idempotencyKey`, capability and trusted surface are server-derived or server-preserved and auditable.
- Provider slugs, vendor cost, margin, service credentials and raw provider errors never reach the browser.
- C2PA/provenance indicators render only from verified evidence. Absence or failure renders an honest unavailable/unverified state.

## Revisit When

- The private API moves behind a different zero-trust gateway that can preserve the same delegation and audit contract.
- `studio-web` and the BFF are split into separately deployed components.
- Commercial hosting requires a different frontend origin or CDN/session architecture.
- Provider APIs expose reliable granular progress or cancellation semantics that justify a richer cross-provider contract.
- Product approves a versioned target that materially changes the Producer/Workbench boundary.
