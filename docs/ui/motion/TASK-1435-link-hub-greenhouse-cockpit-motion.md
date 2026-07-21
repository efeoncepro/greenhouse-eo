# TASK-1435 — Link Hub Greenhouse Cockpit Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1435 — Link Hub Greenhouse cockpit`
- Related flow: [TASK-1435-link-hub-greenhouse-cockpit-flow.md](../flows/TASK-1435-link-hub-greenhouse-cockpit-flow.md)
- Motion scope: Composition Shell, preview sidecar and state feedback

## Contract

- The new workbench starts from `CompositionShell` with `fluidity='rich'`; its canonical stagger/morph owns region movement.
- Opening/closing the preview reuses `ContextualSidecar`: in-flow on desktop and temporary drawer on compact viewports, with canonical focus restoration.
- Reordering blocks provides immediate positional feedback through the existing accessible reorder pattern; drag motion is optional and never the only control.
- Publish/rollback/domain operations use canonical pending, success and error feedback. Animation never represents durability before server confirmation.
- All timing/easing comes from canonical motion tokens. No task-local milliseconds or competing layout-transition system is introduced.
- Reduced motion removes stagger/morph interpolation but preserves every state, focus transfer and announcement.

## Verification

- GVC proves list-to-detail, preview open/close, validation, publish and rollback at 1440/390.
- Reduced-motion capture reaches identical states with stable focus.
- Interrupted preview/layout transitions settle without stale controls, duplicate commands or horizontal overflow.
