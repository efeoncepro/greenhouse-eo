# TASK-1725 — Talent Pool Desk Flow

## Primary flow

1. Authorized operator opens `/agency/hiring/talent-pool`.
2. Server applies `hiring.talent_pool.read`, internal tenant and allowlisted default filters.
3. Operator searches/filters; URL query and cursor become shareable/restorable.
4. Selecting a person opens profile/evidence while preserving list context.
5. Operator opens an exact Application 360 or chooses `Proponer invitación`.
6. Proposal returns opening, purpose, contactability, duplicate application and warnings.
7. Operator confirms; command returns receipt/application reference and UI reads back canonical state.

## Alternate and denial paths

- `needs_reconsent`, withdrawn or expired → show reason and disable invitation; never expose contact.
- Duplicate application → proposal explains existing application and offers canonical open/read path, not another create.
- Partial/stale evidence → retain person with coverage/freshness labels; no negative fit inference.
- Denied → show no count/result/existence hints.
- Timeout/conflict → preserve proposal as unconfirmed and refresh server state; never imply invite.

## Desktop/mobile transformation

- Desktop keeps table and in-flow sidecar together.
- Mobile selection becomes full-width detail; Back restores filters, cursor, scroll and focus to the row.
- Dialog is modal only for final invitation confirmation; filters use a non-modal disclosure.

## Interaction invariants

- Search/filter never writes candidate state.
- Click-away/Escape never confirms invite.
- Contactability and allowedActions come from server, not UI predicates.
- Opening an Application 360 carries exact application ID; no person-level CV fallback.

## GVC Scenario Plan

- Quality profile: `premium`; 1440×1000 and 390×844.
- Sequence: ready → filter → select → evidence → propose → duplicate/conflict → confirm receipt → mobile back restore.
- Separate denied, empty and partial/stale captures; assert no PII/CV and no horizontal overflow.
- Baseline decision: new baseline only after evidence workbench dossier is Apto.

## Design Decision Log

- Preserve list context with sidecar on desktop and route-like replacement on mobile.
- Separate search/read from invite proposal/confirm; no optimistic write.
- Reuse exact Application 360 references and TASK-1718 for deep evidence rather than copying document surfaces.

