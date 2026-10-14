# TASK-2037 — Measurement lifecycle flow

Entry: existing Forms cockpit, selected form; source selector also lists active meeting bindings.
Choose source/surface→load current published revision and typed fields→edit destinations/mapping→
save draft→validate/review→publish. New revisions keep published configuration active until publish.
Disable uses an explicit separate action; pending HTTP already sent cannot be recalled.

Loading disables only resolvable controls. Validation explains fields/scope and retains input.
Conflict asks to reload current revision; no overwrite. Error allows retry of the same idempotent
command. Denied shows no mutation actions. Returning/changing source clears transient state only
after dirty-state handling. Focus stays on action/result; labels, errors and live status accessible.
Mobile single-column and reduced-motion preserve all actions; no new drawer/modal/navigation.

Implementation: MeasurementPolicyPanel → Product API → policy command → readback; UI never
publishes local state directly. Source identity/revision and expected pointer bind every mutation.

## GVC Scenario Plan

Quality profile: premium

Desktop 1440 and mobile 390 cover empty, draft, blocked, review, published, disabled, denied,
network error and stale revision. Capture the measurement-policy-panel marker and inspect frames,
keyboard focus, aria-live outcomes and overflow; produce a review dossier in .captures/task-2037.

## Design Decision Log

Retain the selected source context throughout validation and retries. Idempotency keys survive a
retry; publication waits for server readback. Native controls and feedback preserve keyboard and
reduced-motion behavior without a new transition system.
