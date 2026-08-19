# TASK-1747 — Flow: asignación y recuperación de acceso al assessment

## Meta

- Owner task: `TASK-1747`
- Surface: Application 360 → Evaluación.
- Type: `single-surface` with a recovery Dialog.
- Related wireframe: [wireframe](../wireframes/TASK-1747-application360-assessment-access-recovery.md)

## Flow map

```text
Application 360 / Evaluación
        │
        ├─ no test ──► propose policy assignment ──► confirm ──► open assessment
        │
        └─ open test ─► delivery lifecycle reader
                         │
                         ├─ delivered ─► review / await candidate
                         ├─ accepted or unknown ─► Recover access
                         │                         │
                         │                         ├─ Email ─► command ─► accepted/failed status
                         │                         └─ Secure link ─► command ─► one-time Dialog copy
                         └─ terminal ─► read-only explanation
```

## Interaction and failure rules

- Assignment appears only if policy/command says an instance may be created.
- Recovery is visible only for `assigned|sent` and only to the recovery capability.
- Channel selection is explicit; confirming secure link invalidates any predecessor link.
- Closing/reloading the one-time success Dialog removes the URL from UI state; no history/query parameter persists it.
- 403 becomes read-only explanation; actionable errors retain retry; 409 re-fetches lifecycle/card state.
- `Esc` closes only an idle dialog and restores focus to the initiating action.

## Accessibility and responsive contract

- Dialog title receives focus; choice controls have visible labels; result is announced with `aria-live`.
- 390px stacks all actions, has no clipped status/CTA and no horizontal overflow.
- No custom motion; reduced-motion behavior is identical.
