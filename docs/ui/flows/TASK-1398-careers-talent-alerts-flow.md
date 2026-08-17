# TASK-1398 — Careers Vacancy Alerts Flow

## Flow

```text
Talent Pool self-service (separate existing surface)
  └─ eligible member enables `opening_alerts`
       -> TASK-1397 server-side consumer
       -> public vacancy alert with signed unsubscribe/control link

Careers vacancy list
  ├─ suitable opening -> existing application journey (out of scope)
  └─ no suitable opening / N4 band
       -> render published <greenhouse-form>
       -> visitor completes fields + explicit public-alert consent
       -> generic Growth Forms submit
            ├─ accepted -> generic confirmation; anonymous subscription projection happens server-side
            ├─ validation error -> focus first invalid field
            ├─ transient error -> recovery message + retry
            └─ unavailable flag/form -> hide host; no dead action

Later: hiring.opening.published
  -> TASK-1397 dual-recipient delivery consumer
       ├─ eligible Talent Pool members (`future_opportunities` + `opening_alerts`)
       └─ eligible anonymous Careers subscribers
  -> public alert email with signed unsubscribe/control path
```

## Routing and focus

- The form stays embedded in Careers; it creates no separate browser route or authenticated workflow.
- A vacancy-list empty state may focus/scroll to the same band, never mount a duplicate second form.
- Error focus is controlled by the canonical form renderer; host focus returns naturally to the section after accepted submit.
- Unsubscribe is the generic signed email route supplied by TASK-1397, not a Careers client-side action.

## Recovery boundaries

- A visitor can retry a transient submit error without creating a browser-side duplicate.
- The accepted state is generic so an existing subscriber is not revealed.
- The public form never creates a candidate, Talent Pool membership or `future_opportunities` consent.
- Bank alert eligibility is evaluated server-side at delivery time; `active_process`, `needs_reconsent`, withdrawn, expired or paused members are skipped.
- If the form contract is unavailable or flag-disabled, the visitor can continue browsing Careers; the host removes the unavailable CTA.

## Ownership

- TASK-1397 owns anonymous consent/subscription mutation, Talent Pool alert preference contract, eligibility, dedupe, delivery and unsubscribe.
- TASK-1724 owns the existing tokenized self-service consumer for the `opening_alerts` preference.
- TASK-1398 owns only public visual placement, copy, page state and accessible host behavior.
