# ADR — Published Growth measurement policies

- Status: Accepted; operator approved TASK-2035 plan14/10/2026.
- Scope: scalable configuration and CAPI; CRO/editorial/CRM remain outside this release.
- Owners: Growth Forms/Meetings/Measurement. No topology, project or provider changes.

## Decision

Use versioned server-only policy data in greenhouse_growth as the single matching authorization.
A policy aggregate identifies source kind, stable form_key or scheduler_key, and surface_id.
Immutable revisions pin the published Form version or fingerprint of the active meeting binding,
origins, typed contact mapping and independently enabled destinations. Draft/review/publication
and disable are authorized commands shared by Product API/CLI and the existing Forms cockpit.
The browser neither sees nor chooses an authoritative revision.

## Data and lifecycle

measurement_policy holds the current published revision pointer and serializes mutations.
measurement_policy_revision stores immutable content plus lifecycle draft/review/published/
superseded/disabled. New edits create revisions, never rewrite approved content. At most one
published revision per aggregate. measurement_policy_audit is append-only and records actor,
command, idempotency UUID/request fingerprint and sanitized result. Concurrent commands use
aggregate lock and expected current revision. Reusing a key with different content conflicts.

measurement_conversion gains nullable policy_revision_id for historic receipt compatibility;
new captures always pin it. Enqueue shares the source acceptance transaction/savepoint. Worker
rechecks publication and destination before every HTTP request without authorizing cache.
Disabled/superseded policy cannot authorize pending deliveries; already initiated HTTP cannot
be recalled. No replay is silently upgraded to a newer policy or consent.

## Source and mapping boundary

Forms resolve form_key+published version+active surface/origin and their existing allowlist.
A rename alone preserves identity; a new version requires validating/publishing policy data.
Names can map only to declared fields or explicit normalized outputs of the existing namePolicy;
phone requires the existing E.164 normalization. No arbitrary field values, free JS, URLs, PII,
secrets or hashes enter configuration, public DTOs, ordinary GA4, logs or dataLayer.
Commercial purpose excludes subscribe/application/survey and high-risk sources by default.
Meetings uses the actual active binding (currently discovery/fhsf-efeonce-lead-gen-web), not the
stale efeonce-discovery-30 matching constant. Its authority fingerprint changes when scope does.
Only the two currently approved HTTPS hosts are eligible. Destinations default OFF.

## Growth Forms / Forms / Measurement / CRM boundary

Growth Forms owns normalized acceptance and its consent/outbox. The existing destination maps
those fields to HubSpot Forms secure-submit and then CRM properties. Measurement is a separate
consented projection of that acceptance, with a different typed matching map and delivery ledger.
Policy publication does not configure or replace the HubSpot form/property mapping. Advertising
denial/revocation/unavailability cannot gate commercial acceptance or its CRM outbox. Independent
readback is required for each destination; a Meta receipt never proves CRM contact delivery.
This release preserves that integration; future CRM outcome/event extensions remain out of scope.

## Authenticated server envelope v2

Keep the existing bearer secret and server Client boundary. schema_version2 adds a closed
measurement_policy proof: policy UUID, revision UUID/number, source kind/key/version and surface.
It is emitted only by the backend after policy resolution and persisted in the encrypted snapshot.
sGTM validates bearer, schema/types, consent, website/origin, contact hash formats, UUID/time,
classification and source coherence. It does not enumerate form slugs. Proof fields are removed
before running the Meta tag; no policy controls reach custom_data. Browser events cannot mint
backend authority. This uses the existing trust boundary, not a new signing secret or issuer.

## Access and API parity

Fine read/author/publish/disable capabilities, explicit internal role grants, client denial and
shared canonical commands. Product API is the programmatic path. Its GET includes the versioned
`growth-measurement-policy.v1` operation metadata, effective permissions, source/typed-field
catalog and revision heads. POST `{dryRun:true,command}` validates fresh authority/state/mapping
without creating a draft, audit entry or conversion. Validation is advisory; execution revalidates
under lock. `pnpm growth:measurement` is a first-class HTTP consumer, with discover/validate/apply/
verify and structured JSON. The shared HTTP client checkpoints a known receipt before GET;
unknown outcomes reuse the exact request/key, known receipts retry only independent readback.
Authentication uses the existing user-bound agent-session (private0600 storage state), never an
actor/role passed in JSON. Explicit execution requires existing operator authorization; CLI flags
do not grant it. No browser or database access is required to operate configuration. No automatic MCP/gateway
expansion or broader OAuth access. Operator UI offers typed field options and validation reasons,
not JSON editing or its own rules. No new navigation destination.

## Migration and verification

Additive migration, canonical migrator profile. Seed dry-run/readback preserves six existing
Forms and the actual single meeting binding; never broad-enable the catalog. No synthetic
business submissions, bookings or CRM contacts. Unknown policy/schema/scope fails closed only
for advertising, without rejecting commercial acceptance. Existing consent/GPC, encrypted48h
retention, durable occurrence UUID/time, GA4 mirror and UPD-without-events remain unchanged.
One full develop→main release plus initial GTM contract publication; compatible subsequent
source enablement changes only policy data. New event/destination/host/contract may need code.
Cutover verifies source/worker/DB/Client compatibility before capture activation. Rollback disables
capture/destinations/policies and restores compatible revisions; preserves ledgers and never
re-enables legacy browser Lead triggers. Test Events requires a real temporary per-request code;
provider Processed is distinct from a real commercial acceptance and from EMQ improvement.

## Production closure — 2026-10-14

TASK-2036/2037 delivered in full develop→main PR255, main9690efad; Server9 accepts only
schema2. A source created after release was configured by the actual production HTTP CLI and
received as Processed/Server/website in Meta Test Events without code/redeploy/GTM publication.
The policy was disabled and fixture archived with independent readback. This proves compatible
configuration enablement, not a real commercial acceptance or EMQ improvement.
[API contract](../api/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_API_V1.md),
[operating manual](../manual-de-uso/growth/configurar-medicion-conversiones.md) and
[release evidence/limits](../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).

## Alternatives

Fixed slugs and env lists repeat releases and duplicate authority. Browser analytics_policy_json
is telemetry configuration and cannot authorize advertising. Removing commercial_scope without
an authenticated substitute is rejected. A separate service/store would duplicate the domain.
