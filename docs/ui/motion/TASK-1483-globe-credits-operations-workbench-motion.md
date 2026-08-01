# TASK-1483 — Globe Credits Operations Workbench Motion

## Intent

Motion explica causalidad entre command, ledger y nueva proyección; nunca simula valor, velocidad o live data.

## Choreography

- Runway revela una vez al first load; valores posteriores actualizan sin count-up engañoso.
- Selección pool/entry conserva continuidad hacia sidecar; mobile usa drawer con trap/restore.
- Command: pending -> confirming -> completed/reconciled -> highlight causal corto en ledger row afectada.
- `selection_required`, `second_actor_required`, `confirm_failed`, fingerprint mismatch y timeout unknown aparecen
  estables; timeout recovered sólo resalta receipt/ledger después del readback autoritativo.
- Errors/blockers aparecen estables, sin shake/flicker; no ambient loops.
- Animated counter sólo para valor conocido no-null; null/partial conserva su estado textual.

## Reduced motion and verification

Reduced motion salta a idéntico estado final, conserva focus/live-region y elimina reveal/morph/highlight.
Verificar interrupción, close/reopen, rapid selection, proposal expiry y 390 px sin overflow.
