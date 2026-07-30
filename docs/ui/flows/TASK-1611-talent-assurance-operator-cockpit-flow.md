# Flow — TASK-1611 Talent Assurance Operator Cockpit

Estado: discovery only · no runtime writes.

## Primary flow

1. Operator opens the internal assurance surface.
2. Server applies entitlement, tenant scope and filters.
3. Operator selects a case or stale-evidence alert.
4. UI shows claim, evidence, inference, freshness, source lineage, owner and risk separately.
5. If a proposal exists, UI shows proposed-vs-current diff, policy version, expiry and confidence.
6. Operator chooses `confirm`, `abstain` or `escalate`.
7. A governed command returns an auditable receipt; the UI reads back the resulting state.

## Alternate paths

- Missing critical evidence → block progression and offer evidence-request/escalation path.
- Stale projection → label stale, show last-known timestamp and prevent false certainty.
- Permission denied → explain boundary without leaking case data.
- Command timeout/error → retain proposal as pending; never imply success.
- Mobile/compact → preserve evidence/action order and make diff accessible without horizontal overflow.

## Interaction invariants

Focus returns to the initiating case after confirmation, abstention or error. Escape closes transient review
surfaces. Click-away never confirms. Reduced motion keeps all state changes understandable without animation.

## Implementation gate

This flow consumes TASK-1610 readers and later TASK-1608 commands. It does not define a new API, schema,
agent runtime or source of truth.
