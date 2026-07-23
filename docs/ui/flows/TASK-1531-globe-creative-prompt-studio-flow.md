# TASK-1531 — Creative Prompt Studio Flow

## Flow

`prompt + target valid` → `Mejorar` → `pending` → `ready|partial|error|denied` → inspect
→ `accept|edit source|reject`.

- `accept`: governed command applies proposal, invalidates estimate and restores textarea focus.
- `edit source`: preserves proposal as stale preview, focuses source; next enhance uses new fingerprint.
- `reject`: governed command records rejection outcome without adding prompt history.
- target/prompt change while pending: response may reconcile server-side but is ignored by presentation epoch.
- soft timeout: show slow state; retry reuses/reconciles idempotency rather than blind re-execution.

## State Ownership

- Browser: focus, disclosure, epoch/fingerprint and presentation status.
- BFF/domain: trusted context, idempotency, command outcome, accept/reject and canonical errors.
- Creative Prompt Engineer: structured proposal/evidence, never UI navigation.

## Keyboard & Recovery

- Tab order follows source→action→workbench→proposal actions.
- Completion is announced, not auto-focused.
- `Ajustar original`, accept and reject restore focus predictably.
- No Escape/click-away dismissal: workbench is inline and persists until state changes.

## GVC Scenario Plan

- Scenario: `task-1531-creative-prompt-studio`
- Desktop/mobile: `1440×1000`, `390×844`.
- Exercise happy, partial, slow, error, denied, stale-response and retry/reconcile.
- Assert original preservation, exactly one active fingerprint and focus restore.

## Design Decision Log

- Decision: finite inline flow rather than chat/session.
- Rejected: modal and sidecar; they separate source from proposal and complicate mobile/focus.
- Revisit: multi-turn only after evidence that atomic propose/review/accept is insufficient.
