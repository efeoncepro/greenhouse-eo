# Greenhouse Candidate Review Packet Delegated Access Decision V1

## Status

`Accepted for internal implementation — real-CV MCP activation remains Privacy/Security-gated`

## Date and owners

- Accepted for implementation: `2026-08-16`, by explicit operator direction through `TASK-1718`.
- Product owner: People / Talent.
- Runtime owner: Greenhouse Hiring.
- Boundary owners: Identity & Platform, Efeonce MCP Platform, Security and Legal/Privacy.

This decision authorizes the additive internal portal/API implementation. It does not constitute legal advice or
replace qualified review of the applicable privacy notice, processor/subprocessor posture, retention and
international transfers before real CV text is enabled through MCP.

## Context

The Talent Pool is person-first and intentionally excludes raw CVs from search. Application 360 can already open a
private CV for an authorized operator, but its document reader aggregates every application of the same candidate.
The 2026-08-16 implementation audit found a real person with two applications and two CVs. Reusing that reader for
agents could therefore mix evidence across applications. The live MCP provider exposes only Talent Pool search and
profile metadata; it cannot read documents.

## Decision

1. `HiringApplication` is the review grain. Every portal, Product API, App API and MCP document read resolves the
   exact `applicationId -> assetId` relationship server-side. There is no fallback through `candidateFacetId`,
   `identityProfileId`, name or email.
2. The Talent Pool sidecar may render the exact application's CV with the existing private document viewer and
   `hiring.application.read`. It does not copy the asset, embed it in search results or expose it publicly.
3. Agent access uses a separate allowlisted `CandidateReviewPacketV1` and capability
   `hiring.candidate.review.read`, while still revalidating `hiring.application.read`. The Entra scope remains the
   domain read class `efeonce.mcp.hiring.read`; Greenhouse remains the authorization authority.
4. `mcp.efeonce.org` stays a thin adapter over the Greenhouse App API. It receives no bucket credentials, performs
   no parsing, opens no candidate URL and persists no CV.
5. CV text is a derived, versioned projection produced only from an attached asset with a clean scan. Its identity
   is `assetId + contentHash + extractionVersion + redactionPolicyVersion`. The original private asset remains the
   source of truth. Pending, quarantined, deleted, legacy-unscanned and image-only PDFs never expose text.
6. Text is bounded and chunked. Every chunk carries the same content hash; a caller presenting an old hash receives
   `review_packet_stale`. Candidate text and links are marked `untrusted_candidate_supplied` and never become tool
   instructions.
7. Search/profile DTOs continue to exclude CV, contact fields and document URLs. The exact packet excludes email,
   phone, legal identity, economic expectations, free notes, answer keys, scanner details and protected traits.
8. Every delegated allow/deny attempt records actor, workload, application, purpose, policy/version, field classes,
   outcome and correlation without document text, tokens or candidate PII. Browser asset access retains its
   existing private-asset audit.
9. Portal visibility and agent-text activation have separate kill switches. Portal reuse can ship under the
   existing Hiring purpose; MCP text remains disabled for real data until Security/Privacy sign-off and the
   synthetic allow/deny/IDOR/stale/prompt-injection/deletion gates pass.
10. No reader ranks, recommends, contacts, moves stages, assigns assessments, sends email or writes analysis back.
    Selection remains a human decision.

## Treatment and threat contract

| Concern                  | Control                                                                                         | Acceptance evidence                          |
| ------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Purpose                  | closed enum: `screening_review`, `interview_preparation`, `evidence_comparison`, `audit_review` | unknown/free-form purpose denied and audited |
| Minimization             | positive DTO allowlist; exact CV chunk only                                                     | field snapshot + PII sentinel                |
| Cross-application mixing | exact application/asset join                                                                    | two-app/two-CV regression fixture            |
| Prompt injection         | trust label, no URL fetch, read-only tool                                                       | adversarial host eval                        |
| Parser abuse             | PDF/text/page/timeout bounds; no OCR                                                            | oversized/image-only/malformed fixtures      |
| Deletion/retention       | reader rechecks asset state/hash and projection lifecycle                                       | delete/quarantine/stale tests                |
| Confused deputy          | human OAuth + workload + domain scope + downstream capabilities                                 | allow/deny/revoked/base-only canary          |
| Leakage                  | content capture off; no text in audit/logs/errors                                               | sentinel scan of logs/fixtures               |

## Rollout and rollback

The order is schema/projection OFF, synthetic extraction, portal exact-document integration, App API OFF, gateway
provider OFF, staging allow/deny, real-data sign-off, then one-opening internal canary. Rollback disables reader and
provider flags and stops materialization while preserving audit. External/B2B access remains out of scope: the revocable per-organization/per-person grant already exists
(`greenhouse_core.external_capability_grants`, `TASK-1631`, 2026-09-04); real external access waits for the
native issuer and the multi-issuer gateway (EPIC-044: `TASK-1829`/`TASK-1831`/`TASK-1832`) (updated 2026-09-04,
TASK-1631).

## Rejected alternatives

- Returning documents in bulk Talent Pool search: excessive PII and no exact review intent.
- Reusing `resolveCandidateDocuments(candidateFacetId)` for MCP: mixes applications.
- Passing private asset URLs to the gateway: bypasses lifecycle and leaves reusable document access outside the
  canonical API.
- Gateway parsing or direct GCS/PostgreSQL access: makes transport a data/authorization owner.
- A shared system bearer: loses human attribution and revocation.
- OCR, embeddings or semantic CV search in V1: expands processing and retention without evidence of need.

## Related contracts

- `GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md`
- `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/tasks/in-progress/TASK-1718-hiring-candidate-review-packet-delegated-mcp-reader.md`
