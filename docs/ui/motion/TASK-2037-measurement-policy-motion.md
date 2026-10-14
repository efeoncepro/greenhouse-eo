# TASK-2037 — Native feedback

Reuse MUI focus/loading and existing Motion feedback, no new animation system/durations.
Loading→result retains focus; status aria-live polite; reduced-motion reaches identical final
state without animated transitions. Save/publish disabled only during its pending request;
errors retain input. Verify keyboard and reduced-motion in the premium GVC scenarios.

## GVC Scenario Plan

Quality profile: premium

Desktop 1440 and mobile 390 cover empty, draft, blocked, review, published, disabled, denied,
network error and stale revision. Capture the measurement-policy-panel marker and inspect frames,
keyboard focus, aria-live outcomes and overflow; produce a review dossier in .captures/task-2037.

## Design Decision Log

Retain the selected source context throughout validation and retries. Idempotency keys survive a
retry; publication waits for server readback. Native controls and feedback preserve keyboard and
reduced-motion behavior without a new transition system.

## GVC / Micro Evidence

Record before/loading/result states for save, review, publish and disable. Compare normal and
reduced-motion final states; verify the focused action remains visible and failure retains input.
Evidence is pending implementation and will be linked after actual captures, never inferred.
