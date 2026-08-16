# TASK-1725 — Talent Pool Desk Motion Contract

## Scope

Motion clarifies filter disclosure, list-to-detail continuity, sidecar enter/exit, invite dialog and authoritative receipt.
No animated ranking, candidate carousel, staggered card wall or decorative profile effects.

## Transitions

- Filter disclosure and AdaptiveSidecar reuse canonical primitives/tokens.
- Mobile list→detail may use the existing route/view transition while retaining a stable back target.
- Search loading uses stable skeleton replacement; results do not reorder with spring/layout animation.
- Invite receipt appears only after readback; pending state preserves dialog geometry.

## Reduced motion

Sidecar/detail/dialog resolve immediately to the same focus, selection and receipt. No candidate position or meaning is
communicated through movement.

## GVC / Micro Evidence

- Capture sidecar open/close, filter disclosure, dialog pending/receipt and mobile detail/back in default/reduced motion.
- Assert focus restore, no layout jump, stable result ordering and identical final meaning.

## Design Decision Log

- Reuse existing motion primitives; no new motion system.
- Avoid layout animation on result ordering because it could imply ranking changes.
- Receipt is server-authoritative; no optimistic success transition.

