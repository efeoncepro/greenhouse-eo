# TASK-1583 — Review-to-Element and Governed Reuse Wireframe

## Direction

`repo-native-benchmark`: Evidence-to-Continuation. Review is calm and documentary; reuse is explicit and rights-aware.

## Targets

- Desktop: `1440×1000`, review inspector and Element confirmation dialog.
- Mobile: `390×844`, review/Element sheets with persistent parent context.

## Wireframe

```text
Asset Workspace
  ├ Review: candidate → changes requested → approved
  ├ Comment / Request changes
  └ Create Element
       type · name · scope · source · rights · confirm

New Session
  └ Elements · choose governed reusable handle
```

## Action hierarchy

1. Understand review state.
2. Request changes or approve.
3. Create Element only when eligible.
4. Reuse Element in a new Session.

## State/copy inventory

Not submitted, in review, changes requested, approved, rejected, eligible, rights blocked, creating, created, superseded and failed. Comments never imply approval or spend.

## Implementation Mapping

- Review authority: `TASK-1522`.
- Context/Element authority: `TASK-1580`.
- Asset Workspace entry: `TASK-1582`.
- Copy: Globe copy namespace.
- Motion: epic master motion contract, with stable feedback only.

## GVC Scenario Plan

Scenario `globe-producer-review-to-element`; comment → child Session → compare → approve → create Element → reuse, plus rights-blocked and failed command fixtures. Assert focus, no spend dispatch, no cross-workspace handles and no overflow.

## Design Decision Log

- Selection, approval and reuse are distinct states.
- Request changes creates intent, never execution.
- Element creation is explicit and auditable.
- Public sharing remains a separate read-only surface.
