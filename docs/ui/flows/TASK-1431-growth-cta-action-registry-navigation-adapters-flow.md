# TASK-1431 — Growth CTA action dispatch flow

## Meta

- Owner task: `TASK-1431`
- Surfaces: publish gate, public render API, portable renderer and external/internal destination

## Flow Map

```text
operator authors action policy
  -> registry validates kind + policy
     -> invalid/unregistered: reject draft/publish
     -> valid: resolver produces browser-safe action
        -> public renderer receives resolved union
           -> primary activation (once)
              -> growth_form: mount governed form -> submit/error/recovery
              -> navigate: validate resolved href -> same/new context -> destination
              -> executor failure: restore button -> sanitized signal
```

## Routing Contract

- `link_url`: relative or HTTPS destination allowed by the server contract.
- `open_think_tool`: governed Think destination plus allowlisted campaign context; no PII.
- `book_meeting`: governed Meetings URL; navigation only, no CRM mutation.
- `open_growth_form`: existing Growth Forms contract remains submission authority.
- `dismiss`: existing suppression control, outside primary action dispatch.

## Focus and Accessibility

- Native button activation works with keyboard.
- Duplicate activation is blocked while pending.
- Form focus/recovery uses the existing Growth Forms behavior.
- On executor failure, focus remains on or returns to the re-enabled primary button.

## Failure and Recovery

- Invalid or unavailable destinations fail before public render.
- Runtime navigation failure restores the CTA and emits an allowlisted reason.
- Unknown kind from a stale/new contract fails closed; it never guesses a destination.
- Rollback pauses affected CTA versions before reverting the public bundle.

## GVC Scenario Plan

- Execute form, internal link, Think tool and Meetings paths at `1440` and `390`.
- Capture ready/pending/error/form states and assert final URLs for navigation paths.
- Verify keyboard activation, duplicate-click guard, safe new-tab attributes and zero page overflow.

## Design Decision Log

- One dispatcher consumes the resolved action family; action-specific policy never reaches browser code.
- Form and navigation are the only V1 executor families. Asset delivery, embedded forms and CRM handoff remain deferred adapters.
