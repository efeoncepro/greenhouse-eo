# TASK-1686 — Motion contract: collaborator navigation

## Motion decision

This task introduces no new animation. It preserves the existing Vuexy drawer and MUI Popper/Fade behavior while replacing the avatar trigger with a semantic control. The interaction must reach the same usable final state when reduced motion is enabled.

## Interaction feedback

- Opening the avatar uses the existing Popper/Fade implementation; no bespoke timing, easing, transform, or stagger is introduced.
- Closing through Escape or click-away returns focus to the avatar trigger after the existing close transition completes.
- Opening the mobile drawer uses the existing drawer behavior; the collaborator branch changes content only.
- Hover, focus, active, and disabled states use existing MUI/Vuexy treatment and visible keyboard focus.

## Reduced-motion contract

Reduced motion does not remove information or change the final open/closed state. GVC verifies menu/drawer final state, focus restoration and absence of horizontal overflow with reduced motion active.

## GVC / Micro Evidence

- Capture collaborator avatar open/close on desktop and mobile 390 px with default and reduced motion.
- Exercise Enter/Space, Escape and click-away; verify focus returns to `[data-capture="avatar-trigger"]` (marker real del runtime, `UserDropdown.tsx`) o el control semántico que lo reemplace.
- Record the existing drawer/Popper behavior only; reject any new custom animation class or timing value.
- Include the evidence in the premium review dossier alongside the rail/avatar/cmdk captures.

## Design Decision Log

Reuse existing motion avoids changing the navigation platform for a projection-only fix. A dedicated contract exists because keyboard feedback, close/focus timing and reduced-motion equivalence are acceptance criteria; it does not authorize a new microinteraction.
