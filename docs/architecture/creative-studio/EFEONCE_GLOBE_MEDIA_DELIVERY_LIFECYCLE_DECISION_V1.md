# Efeonce Globe — Media Delivery and Lifecycle Decision V1

- Decision: ADR-008
- Status: Accepted; implementation and commercial rollout gated
- Date: 2026-07-23
- Owners: Efeonce Globe platform, creative operations and security
- Implements through: TASK-1521 integration plus independently owned delivery slices
- Related: `EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`,
  `EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`,
  `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`, `TASK-1503`, `TASK-1521`

## Context

The internal Globe runtime can generate, retain, recover and play real image, video and audio outputs. The
verified deployment on 2026-07-23 has nine real feed pieces and three promoted routes. That proves the governed
generation seam, not a scalable commercial media-delivery path.

Today cards and the viewer consume originals, the API can materialize a complete GCS object before responding,
there are no governed thumbnail/poster/transcode/waveform derivatives, feed visibility while governance is
pending is not explicit, and no durable orphan reconciliation/garbage collection contract exists. A same-key GCS
rewrite that returns `412` also needs an integrity decision, not a blind retry.

These are one shared boundary: the lifecycle from an immutable retained original to a safe, efficient
representation delivered to an authorized human and eventually reclaimed. Solving each symptom inside UI code,
the web process or the asset-governance worker would duplicate authority and create a media monolith.

## Decision

Globe adopts an **immutable original + versioned derived assets + authorized streaming gateway + mark-and-sweep
lifecycle**.

PostgreSQL/domain state remains the authority for ownership, governance, visibility and lifecycle. Private GCS is
the byte store, never an authority source. Provider URLs, public objects and bucket listings never become feed or
access contracts.

Five independently deployable responsibilities cooperate through durable contracts:

1. **Original retention** verifies and records immutable content-addressed originals.
2. **Derivative planning and transformation** creates versioned delivery representations asynchronously.
3. **Media serving** re-authorizes every request and streams the selected object with real byte-range semantics.
4. **Feed projection** exposes metadata according to governance and audience policy, independently of byte
   availability.
5. **Lifecycle reconciliation/GC** discovers drift and reclaims unreferenced objects through a reversible,
   audited mark-and-sweep process.

They may share packages and schemas where the aggregate requires a transaction, but they do not share a
request-serving process, scheduler loop or catch-all worker.

## 1. Originals are immutable and private

- An original is addressed by its verified SHA-256 and stored only in an allowlisted, private, environment-isolated
  Globe GCS location.
- The retained-output record binds workspace, experiment/run, hash, observed MIME, byte length, provenance,
  governance state and retention state. The object name alone grants no authority.
- Upload/promotion uses generation and absence preconditions. A same-key `412` triggers metadata and hash
  reconciliation:
  - exact hash, size and required metadata match: record idempotent success;
  - any mismatch: quarantine the conflicting object/reference, emit an integrity incident and stop;
  - never overwrite or treat `412` as permission to retry destructively.
- Originals remain the fidelity source and governed download target. A derivative failure never mutates or
  replaces the original.

## 2. Derived assets are first-class, versioned records

A derivative is immutable and identified by:

`(sourceSha256, derivativeProfileId, profileVersion, transformerVersion) → outputSha256`

The durable record also contains workspace scope, source retention reference, MIME, dimensions/duration where
applicable, byte length, transformer evidence, state (`requested|processing|ready|failed|superseded`) and timestamps.
It never reuses the source object key.

Profiles are governed data, not branches in UI code:

| Modality | Required delivery profiles | Initial posture |
| --- | --- | --- |
| Image | card thumbnail and bounded viewer preview | modern web image plus declared fallback; original remains download |
| Video | poster and browser-compatible playback transcode | MP4/H.264/AAC baseline initially; adaptive streaming deferred |
| Audio | waveform/peaks and browser-compatible playback representation when needed | peaks are data, not authority; original remains download |

Exact dimensions, codecs, bitrates and quality values are profile versions validated by canary evidence. Changing
them creates a new version and supersedes old derivatives; it does not rewrite existing objects.

Derivative intents are appended transactionally when an original reaches the policy state that permits
transformation. Dedicated keyless one-shot Cloud Run media jobs claim bounded batches with leases, fencing,
idempotency and retry budgets. The asset-governance worker remains responsible for malware/C2PA/rights decisions;
it does not become a transcoder. The web/BFF never performs media transformation.

## 3. Governance and feed visibility are explicit

`candidate_ready` means generation completed. It does not mean the bytes are governance-eligible or shareable.
The feed projection follows this matrix:

| Asset state | Owner feed | Shared/client feed | Bytes |
| --- | --- | --- | --- |
| generated/governance pending | metadata placeholder with real run state | hidden | withheld |
| governance eligible | preview representation; original download subject to capability | only when its review/share policy also permits | authorized |
| rejected/restricted/failed | metadata plus safe status/recovery action | hidden | withheld |
| deleted/tombstoned | removed or tombstone according to audit policy | hidden | withheld |

This preserves immediate feedback after a command without exposing unscanned bytes. A pending card is created from
durable run/output state, not a browser-only spinner. Projection catches up through durable events/read models and
can be rebuilt. Viewer selection must resolve by stable asset/output identity; title and state derive from that
record rather than from a hard-coded recipe fallback.

## 4. Media serving performs real Range streaming

The serving path is an authority gateway, not a byte buffer:

1. authenticate the current session/workload and derive actor/workspace server-side;
2. validate the short-lived retrieval grant/ticket and bind it to workspace, output, representation and
   disposition;
3. re-check current retained-output authority and governance/visibility state;
4. select an eligible derivative or the original according to the request and profile policy;
5. pass a valid single `Range` request to GCS and pipe the upstream stream to the response with backpressure.

The first version supports one byte range. It returns `206`, `Content-Range`, `Accept-Ranges: bytes`, the bounded
`Content-Length`, correct MIME and `Cache-Control: private, no-store`; unsatisfiable ranges return `416`.
Multipart ranges are rejected until explicitly justified. `GET` without `Range` also streams and must not build a
full in-memory `Buffer`, `Blob` or base64 body in the API/BFF.

Native `<video>`/`<audio>` elements need a URL and cannot attach an authorization header. They use a same-origin,
short-lived, session-bound retrieval ticket in the query, with strict referrer/log redaction and the same
server-side re-authorization as the header form. It is not an independent bearer and cannot outlive or bypass the
session. Images and programmatic downloads may use the header form.

Authenticated private media remains off CDN. Edge caching, signed public URLs, HLS/DASH and multi-region delivery
require a later ADR with an authorization-safe cache key and revocation model.

## 5. Orphan reconciliation and GC are mark-and-sweep

GC never means “list a bucket and delete what is not recognized now.” A reconciler builds an inventory and
classifies both drift directions:

- durable record references a missing/unreadable object;
- object has no durable original/derivative record;
- derivative references a missing source or superseded profile;
- record/object metadata or hash disagree.

An object is reclaimable only if no retained output, input/reference, derivative, active job/lease, review/share,
legal/retention hold or explicit recovery hold references it. GC then:

1. marks an orphan candidate with reason, first-seen time, object generation and evidence;
2. produces a dry-run report and metrics;
3. waits a policy-configured grace period;
4. requires an authorized apply operation with bounded batches and maker-checker evidence for commercial stages;
5. deletes with generation-match preconditions, derivatives before originals, and appends an audit result.

Reappearing references clear the mark before deletion. Retries are idempotent. A mismatch, ambiguous authority or
active hold fails closed. No SQL manual, ad-hoc bucket deletion or destructive backfill is an operational path.

## Runtime boundaries

| Boundary | Owns | Must not own |
| --- | --- | --- |
| Producer/domain + Postgres | retained-output authority, derivative intents/records, feed policy state, lifecycle evidence | media bytes or provider URLs |
| Asset-governance worker | malware, C2PA, rights and eligibility | thumbnails/transcodes or feed layout |
| Media derivative workers | deterministic profile transformations and evidence | eligibility, membership or public access |
| API/BFF media gateway | session/grant authorization, representation selection, streaming headers/backpressure | full-object buffering or transformation |
| Feed projector | audience-safe metadata/read model | byte authority |
| Lifecycle reconciler/GC | inventory, marks, grace, guarded deletes | immediate list-and-delete |
| Private GCS | immutable originals and derivatives | ownership, tenancy or visibility decisions |

Originals and derivatives use separate governed prefixes or buckets and independent lifecycle configuration per
environment. A commercial stage cannot share byte storage, service identities or tickets with `internal_smoke`.

## Reliability and observability

The implementation must expose at least:

- derivative backlog count/oldest reclaimable age and failures by profile/transformer version;
- time from eligible original to ready derivative, and preview fallback rate;
- media responses by `200|206|416`, time-to-first-byte, bytes streamed and aborted streams;
- process memory/concurrency evidence proving object size does not determine request memory;
- original-versus-derived delivery volume;
- pending feed projection age and governance-state mismatches;
- orphan candidates by reason/age, dry-run/apply/deletion counts and referential drift;
- same-key/metadata/hash integrity mismatches as a paging-class security/data signal.

Initial SLO values are set from canary measurements before commercial promotion; they are configuration/evidence,
not guessed constants in this ADR.

## Fitness functions and rollout gates

- Contract tests prove a pending asset produces an owner-only placeholder but no retrievable bytes.
- Image, video and audio canaries prove their required derivative profile and original download.
- Video/audio tests prove `Range: bytes=…` reaches storage, returns correct `206/416` semantics and starts playback
  without full-object materialization.
- Load evidence proves bounded process memory and backpressure under concurrent streams.
- Cross-workspace, expired session/ticket, revoked grant and restricted asset all fail closed without revealing
  existence.
- Derivative retries create one terminal record/object per profile version.
- GC runs dry before apply, honors grace/holds/references and proves generation-precondition rollback behavior.
- Commercial promotion remains blocked until these gates run against the exact deployment/config and the
  independent route-promotion, identity, ledger, recovery and release gates also pass.

## Alternatives rejected or deferred

1. **Serve originals directly everywhere.** Rejected: excessive bandwidth/latency, browser incompatibility and no
   stable presentation contract.
2. **Transform on demand in the BFF/API.** Rejected: request latency, memory amplification and duplicate work.
3. **Add transcoding to the asset-governance worker.** Rejected: couples security eligibility to delivery formats
   and creates a monolithic failure/release boundary.
4. **Client-side thumbnails/waveforms as source of truth.** Rejected: inconsistent cost, no durable reuse and no
   governed evidence.
5. **Public objects, provider URLs or long-lived signed URLs.** Rejected: authority/revocation and provenance leak.
6. **Immediate bucket lifecycle deletion.** Rejected: cannot account for domain references, holds or delayed
   transactions.
7. **HLS/DASH and CDN now.** Deferred: materially larger delivery/caching contract without current scale evidence.

## Consequences and decomposition

This decision adds durable derivative and lifecycle records, transformation compute and reconciliation work, but
keeps each load independently scalable. TASK-1521 owns the commercial integration gate and evidence aggregation;
implementation should be decomposed into separately owned build units:

1. derivative profile/domain/schema and outbox contract;
2. image/video/audio transformation adapters and worker runtime;
3. streaming gateway with Range conformance;
4. feed projection/visibility contract;
5. orphan inventory, mark-and-sweep GC and operator controls.

No unit may claim commercial completeness alone. The decision should be revisited before edge caching/adaptive
streaming, multi-region storage, destructive retention shortening, or a new media class whose delivery cannot fit
the representation contract.
