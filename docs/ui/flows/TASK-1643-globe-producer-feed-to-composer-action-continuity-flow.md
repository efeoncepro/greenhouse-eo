# TASK-1643 — Feed-to-Composer Action Continuity Flow

## Flow Contract

```text
Producer feed card
  ├─ Reference ──> governed asset command ──> composer reference tray ──> focus on next input
  ├─ Recreate ───> governed recipe read ────> composer context ────────> estimate stale until reviewed
  ├─ Favorite ───> governed asset action ───> card readback ────────────> focus remains on action
  └─ Download ───> authorized retrieval ───> browser download/preview ─> focus remains on action
```

## Entry & Exit

- Entry: authenticated Producer feed with a real item and governed availability state.
- Exit Reference: composer contains the authorized source/role; no run or credit reservation exists.
- Exit Recreate: composer contains the governed recipe/context; estimate is stale if any input axis changed.
- Exit Favorite/Download: readback or download result is visible; no cross-workspace bytes are exposed.

## Focus & Recovery

- Pending keeps focus on the initiating action and exposes a named status.
- Successful Reference/Recreate moves focus to the first relevant composer control and announces the handoff.
- Error returns focus to the initiating action; retry is shown only when the command is safe.
- Escape closes local feedback and never cancels an already accepted command silently.
- Session expiry preserves the card context and routes through the existing reauth state.

## Branches

- `disabled`: no handler is passed; reason is visible and accessible.
- `denied`: server policy/readback wins; UI does not guess rights.
- `degraded`: distinguish retained bytes, preview and governance; do not offer a dead Download.
- `recipe unavailable`: Recreate remains disabled with a reason; no legacy fallback is invented.

## Mobile & Reduced Motion

- At 390 px the action rail stays within the card width and retains 44 px touch targets.
- Handoff uses the existing Producer workspace route/state; no new mobile navigation layer is introduced.
- Reduced motion removes transitions but preserves pending, result, focus and announcements.
