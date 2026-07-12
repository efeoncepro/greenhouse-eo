# TASK-1398 — Careers Talent Alerts Flow

## Flow

```text
Careers vacancy list
  ├─ suitable opening -> existing application journey (out of scope)
  └─ no suitable opening / N4 band
       -> render published <greenhouse-form>
       -> visitor completes fields + explicit consent
       -> generic Growth Forms submit
            ├─ accepted -> generic confirmation; subscription projection happens server-side
            ├─ validation error -> focus first invalid field
            ├─ transient error -> recovery message + retry
            └─ unavailable flag/form -> hide host; no dead action

Later: hiring.opening.published
  -> TASK-1397 delivery consumer
  -> alert email with unsubscribe
```

## Routing and focus

- The form stays embedded in Careers; it creates no separate browser route or authenticated workflow.
- A vacancy-list empty state may focus/scroll to the same band, never mount a duplicate second form.
- Error focus is controlled by the canonical form renderer; host focus returns naturally to the section after accepted submit.
- Unsubscribe is the generic signed email route supplied by TASK-1397, not a Careers client-side action.

## Recovery boundaries

- A visitor can retry a transient submit error without creating a browser-side duplicate.
- The accepted state is generic so an existing subscriber is not revealed.
- If the form contract is unavailable or flag-disabled, the visitor can continue browsing Careers; the host removes the unavailable CTA.

## Ownership

- TASK-1397 owns consent, subscription mutation, dedupe, delivery and unsubscribe.
- TASK-1398 owns only visual placement, public page state and accessible host behavior.
