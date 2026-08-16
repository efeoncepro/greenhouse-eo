# Greenhouse Talent Pool Full API Parity Decision V1

## Status

`Accepted — external recontact remains policy-gated`

## Date and owner

- Accepted: `2026-08-16`, by operator direction through `TASK-1723`.
- Domain owner: People / Talent.
- Control owners: Identity & Platform, Legal/Privacy and Security.
- Runtime owner: Greenhouse Hiring.

This acceptance authorizes the additive technical foundation and internal read-only operation. It does not replace
qualified Chilean legal review and does not authorize contacting a person for a future opportunity without a valid,
current purpose grant.

## Context

Hiring is already person-first: `greenhouse_core.identity_profiles` is the identity root,
`greenhouse_hiring.candidate_facet` is unique per person and `hiring_application` preserves each application. The
current 52 candidate facets have process-scoped `consent_status='granted'`, but no explicit Talent Pool purpose and
no retention policy populated. The public notice covers managing an application and a 12-month applicant retention
window; it does not silently become permission for future-opportunity contact.

Greenhouse needs to rediscover evaluated people without rebuilding a sourcing process, while preserving purpose,
withdrawal, provenance and human decision ownership. UI, Nexa, App API and MCP must consume the same governed
readers/commands.

## Decision

### 1. Person-first aggregate

`identity_profile` remains the person source of truth. A `talent_pool_membership` is a subordinate one-to-one
aggregate of `candidate_facet`; it never stores name, email, phone, CV, portfolio content or free-form notes.
Applications, assessments and documents remain owned by Hiring and are referenced, never copied as raw content.

### 2. Purpose and lifecycle are separate from retention

Membership lifecycle is one of:

- `active_process`: discoverable only for the current application purpose;
- `pool_eligible`: explicit and unexpired `future_opportunities` grant exists;
- `needs_reconsent`: retained evidence exists but future contact is not allowed;
- `paused`: the person temporarily disabled future contact;
- `withdrawn`: the applicable grant was revoked;
- `expired`: purpose grant or retention window expired.

The append-only `talent_pool_consent_event` ledger records purpose, action, policy version, source, evidence
reference, occurrence/effective/expiry times, actor class and correlation/idempotency identifiers. Current state is
a rebuildable projection. Withdrawal wins over concurrent availability or invitation commands.

Purposes V1 are `active_application` and `future_opportunities`. An existing process grant can support the first;
only an explicit, specific grant can support the second. `discoverable` and `contactable` are derived decisions with
reason codes, never mutable universal booleans.

### 3. Evidence and search

The search projection stores only structured, job-related facts and opaque source references: application/opening,
public competency keys, declared seniority, declared country, declared availability, assessment competency result,
coverage and freshness. It must not contain raw CV text, open answers, contact data, notes, economic expectations,
photos or inferred protected characteristics.

Search is filter-based, deterministic and paginated. Default ordering is recency plus opaque profile ID for stable
pagination, not a fit score. Reasons are evidence-backed matches and missing/stale declarations; they are not a
recommendation to reject, hire or rank. A person appears once even with several applications.

### 4. Field matrix

| Surface | Allowed | Denied |
| --- | --- | --- |
| Internal Desk | opaque IDs, display name resolved at read time, lifecycle, declared filters, evidence refs/reasons, allowed actions | raw CV/answers in search, email, phone, notes, economics |
| Candidate self-service | own lifecycle, purpose grants, expiry, availability, correction/withdraw actions | internal decisions, other candidates, hidden assessment material |
| App API / Nexa | same internal DTO under current user capability and purpose | broader fields than the equivalent UI |
| MCP delegated reader | opaque IDs, authorized display name, lifecycle, structured reasons/coverage/freshness | contact, CV, documents, notes, economics, raw answers, internal IDs |

Exact CV/document review remains the separately governed application packet reader (`TASK-1718`), not Talent Pool
search.

### 5. Canonical capabilities and commands

- `hiring.talent_pool.read:read`
- `hiring.talent_pool.manage:update`
- `hiring.talent_pool.invite:execute`
- `hiring.talent_pool.self_service:update` for a candidate acting only on their own token-bound resource

Canonical primitives are `searchTalentPool`, `getTalentPoolProfile`, `recordTalentPoolConsent`,
`withdrawTalentPoolConsent`, `updateTalentAvailability` and `inviteTalentToOpening`. Product API, App API, UI, Nexa,
MCP and runbooks are clients. Resource and capability authorization is re-evaluated on every call.

Invitation is a governed command: it requires an exact opening, `future_opportunities` contactability, human
confirmation and an idempotency key; it creates or reuses the canonical `HiringApplication`. It does not move stage,
assign a test, email, score, reject or hire. Those effects remain with their existing owners and `TASK-1719`.

### 6. Transaction, audit and evolution

Writes use a local PostgreSQL transaction plus durable outbox. Consent, withdrawal, availability and invitation
history are append-only; mutable current state is reconstructible. At-least-once consumers deduplicate by event or
aggregate version and reconcile before retrying an uncertain outcome.

Schema changes follow expand → backfill/dry-run → shadow/read-only → canary → enforcement. Historical records are
classified `active_process` or `needs_reconsent`; the backfill never creates a `future_opportunities` grant. Rollback
turns flags off and stops consumers while retaining schema and audit.

### 7. Agent and MCP boundary

Agents may search and explain structured evidence under a delegated, expiring, purpose-bound grant. They cannot
broaden authorization, retrieve denied fields, infer protected traits or execute adverse decisions. The Efeonce MCP
gateway remains a transport/auth/routing adapter; Greenhouse owns data, policy, authorization, audit and DTO
redaction. A provider is disabled until allow/deny/redaction/fault tests and a gateway canary pass.

## Consequences

- Existing applicants can be indexed immediately for their active process, but not mass-contacted for future roles.
- A new explicit opt-in can incrementally make a person `pool_eligible` without duplicating their profile.
- People gets a reusable bank with Full API Parity and reversible rollout.
- Legal/Privacy must approve public copy, policy version, TTL and retention before external recontact is enabled.

## Runtime status — 2026-08-16

- Producción interna: projection/search/Desk/App API/MCP read-only activos; invite y self-service externos siguen OFF.
- Cohorte reconciliada: 52 memberships, 50 `active_process`, 2 `needs_reconsent`; ninguna persona recibió
  consentimiento futuro por backfill.
- MCP: `hiring.talent_pool.search` y `hiring.talent_pool.profile.get` están federadas para identidad interna
  delegada. Canary OAuth real: allow search/profile `200`; cliente base-only separado: deny Hiring `403`.
- Recontacto: continúa bloqueado hasta aprobación People + Legal/Privacy del copy, policy version, TTL y retención.

## Rejected alternatives

- Reusing `candidate_facet.consent_status` as universal opt-in: rejects purpose limitation and history.
- A new candidate/person table: creates identity drift.
- Copying CVs or embeddings into a global index: expands sensitive-data exposure and deletion complexity.
- AI ranking: obscures evidence and creates an adverse-decision path.
- MCP direct database access: bypasses provider ownership, capability checks and redaction.

## Verification and revisit triggers

The release must prove one membership per facet, append-only history, deterministic dedupe, no-PII DTO sentinels,
withdrawal/expiry propagation, capability denials, idempotent invite/readback, outbox audit and backfill
reconciliation. Revisit if Chilean counsel changes the lawful basis/TTL, external customer access is proposed,
semantic document search is added, or a new identity root replaces `identity_profile`.

## Related contracts

- `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/operations/hiring/2026-08-12-revision-privacidad-contacto-careers.md`
- `docs/tasks/complete/TASK-1723-talent-pool-canonical-foundation-full-api-parity.md`
